//
//  QMATarget.h
//  QMA-AR
//
//  Created by JB DeLima on 5/22/14.
//  Copyright (c) 2014 GuideOne. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class QMAPoi;

@interface QMATarget : NSManagedObject

@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSSet *poiList;
@end

@interface QMATarget (CoreDataGeneratedAccessors)

- (void)addPoiListObject:(QMAPoi *)value;
- (void)removePoiListObject:(QMAPoi *)value;
- (void)addPoiList:(NSSet *)values;
- (void)removePoiList:(NSSet *)values;

@end
