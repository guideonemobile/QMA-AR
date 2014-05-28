//
//  QMATarget.h
//  QMA-AR
//
//  Created by JB DeLima on 5/23/14.
//  Copyright (c) 2014 GuideOne. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class QMAPoi;

@interface QMATarget : NSManagedObject

@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSSet *pointsOfInterest;
@end

@interface QMATarget (CoreDataGeneratedAccessors)

- (void)addPointsOfInterestObject:(QMAPoi *)value;
- (void)removePointsOfInterestObject:(QMAPoi *)value;
- (void)addPointsOfInterest:(NSSet *)values;
- (void)removePointsOfInterest:(NSSet *)values;

@end
