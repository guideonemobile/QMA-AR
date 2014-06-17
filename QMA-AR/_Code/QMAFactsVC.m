
#import "QMAFactsVC.h"


@interface QMAFactsVC ()

@property (nonatomic, weak) IBOutlet UIWebView *webView;

@end


@implementation QMAFactsVC

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    NSURL *baseURL = [[[NSBundle mainBundle] resourceURL] URLByAppendingPathComponent:@"html" isDirectory:YES];
    NSURL *htmlURL = [baseURL URLByAppendingPathComponent:self.poi.factsHTMLFile isDirectory:NO];
    NSError *error = nil;
    NSString *htmlString = [NSString stringWithContentsOfURL:htmlURL encoding:NSUTF8StringEncoding error:&error];
    if (error) {
        QMALog(@"Error: %@", [error localizedDescription]);
    }
    [self.webView loadHTMLString:htmlString baseURL:baseURL];
}

- (IBAction)didTapToCloseVC:(UIButton *)sender {
    [self dismissViewControllerAnimated:YES completion:^{}];
}

@end
